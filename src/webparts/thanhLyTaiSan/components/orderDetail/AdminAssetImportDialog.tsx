import * as React from 'react';
import type { SPHttpClient } from '@microsoft/sp-http';
import { AppButton, ConfirmDialog } from '../common';
import type { IAssetImportResult } from '../services/assetImportService';
import { importAssetsFromExcel, loadProductCodeIdMap, previewAssetImportFromExcel } from '../services/assetImportService';
import { useToast } from '../ToastProvider';
import styles from './AdminAssetImportDialog.module.scss';

type TImportDialogStep = 'pickFile' | 'preview' | 'importing' | 'result';

function buildImportToastMessage(result: IAssetImportResult): string {
  const summary: string =
    'thêm mới ' + String(result.inserted) + ', cập nhật ' + String(result.updated);

  if (result.failed > 0) {
    return 'Import có lỗi: ' + summary + ', lỗi ' + String(result.failed);
  }

  return 'Import thành công: ' + summary;
}

export interface IAdminAssetImportDialogProps {
  isOpen: boolean;
  siteUrl: string;
  spHttpClient: SPHttpClient;
  onClose: () => void;
  onCompleted: (result: IAssetImportResult) => void;
}

export function AdminAssetImportDialog(props: IAdminAssetImportDialogProps): React.ReactElement {
  const { showToast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [step, setStep] = React.useState<TImportDialogStep>('pickFile');
  const [selectedFileName, setSelectedFileName] = React.useState<string>('');
  const [fileBuffer, setFileBuffer] = React.useState<ArrayBuffer | undefined>(undefined);
  const [totalRows, setTotalRows] = React.useState<number>(0);
  const [insertCount, setInsertCount] = React.useState<number>(0);
  const [updateCount, setUpdateCount] = React.useState<number>(0);
  const [skippedEmptyRows, setSkippedEmptyRows] = React.useState<number>(0);
  const [parseError, setParseError] = React.useState<string>('');
  const [importResult, setImportResult] = React.useState<IAssetImportResult | undefined>(undefined);
  const [batchProgress, setBatchProgress] = React.useState<string>('');

  React.useEffect(() => {
    if (!props.isOpen) {
      setStep('pickFile');
      setSelectedFileName('');
      setFileBuffer(undefined);
      setTotalRows(0);
      setInsertCount(0);
      setUpdateCount(0);
      setSkippedEmptyRows(0);
      setParseError('');
      setImportResult(undefined);
      setBatchProgress('');
    }
  }, [props.isOpen]);

  function openFilePicker(): void {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const inputElement: HTMLInputElement = event.target;
    const selectedFile: File | undefined = inputElement.files?.[0];

    if (!selectedFile) {
      return;
    }

    setParseError('');
    setSelectedFileName(selectedFile.name);

    try {
      const buffer: ArrayBuffer = await selectedFile.arrayBuffer();
      const existingCodeToIdMap: Map<string, number> = await loadProductCodeIdMap(props.siteUrl, props.spHttpClient);
      const preview = await previewAssetImportFromExcel(buffer, existingCodeToIdMap);

      setFileBuffer(buffer);
      setTotalRows(preview.totalRows);
      setInsertCount(preview.insertCount);
      setUpdateCount(preview.updateCount);
      setSkippedEmptyRows(preview.skippedEmptyRows);
      setStep('preview');
    } catch (error: unknown) {
      const message: string = error instanceof Error ? error.message : 'Không đọc được file Excel.';
      setParseError(message);
      showToast(message, 'error');
      setStep('pickFile');
      setFileBuffer(undefined);
    } finally {
      inputElement.value = '';
    }
  }

  async function handleConfirmImport(): Promise<void> {
    if (!fileBuffer) {
      return;
    }

    setStep('importing');
    setBatchProgress('Đang ghi dữ liệu lên SharePoint...');

    try {
      const result: IAssetImportResult = await importAssetsFromExcel({
        siteUrl: props.siteUrl,
        spHttpClient: props.spHttpClient,
        fileBuffer,
        onProgress: (completedBatches: number, totalBatches: number): void => {
          setBatchProgress('Đang ghi batch ' + String(completedBatches) + '/' + String(totalBatches) + '...');
        }
      });

      if (result.failed === 0) {
        showToast(buildImportToastMessage(result), 'success');
        props.onCompleted(result);
        props.onClose();
        return;
      }

      showToast(buildImportToastMessage(result), 'error');
      setImportResult(result);
      setStep('result');
      props.onCompleted(result);
    } catch (error: unknown) {
      const message: string = error instanceof Error ? error.message : 'Import thất bại.';
      showToast(message, 'error');
      setImportResult({
        inserted: 0,
        updated: 0,
        failed: totalRows,
        errors: [message],
        totalRows
      });
      setStep('result');
    }
  }

  function renderBody(): React.ReactNode {
    if (step === 'pickFile') {
      return (
        <>
          <div className={styles.dropZone}>
            <p className={styles.dropZoneTitle}>Chọn file Excel (.xlsx, .xls)</p>
            <p className={styles.dropZoneHint}>Đọc sheet đầu tiên. Khóa upsert: ProductCode.</p>
            {selectedFileName ? <p className={styles.fileName}>{selectedFileName}</p> : <></>}
            <AppButton variant="secondary" onClick={openFilePicker}>
              Chọn file
            </AppButton>
          </div>
          {parseError ? <ul className={styles.errorList}>{parseError}</ul> : <></>}
        </>
      );
    }

    if (step === 'preview') {
      return (
        <>
          <p className={styles.fileName}>{selectedFileName}</p>
          <ul className={styles.summaryList}>
            <li>{totalRows} dòng hợp lệ</li>
            <li>Thêm mới: {insertCount}</li>
            <li>Cập nhật: {updateCount}</li>
            {skippedEmptyRows > 0 ? <li>Bỏ qua {skippedEmptyRows} dòng trống</li> : <></>}
          </ul>
        </>
      );
    }

    if (step === 'importing') {
      return <p className={styles.progressText}>{batchProgress}</p>;
    }

    if (!importResult) {
      return <></>;
    }

    return (
      <>
        <ul className={styles.summaryList}>
          <li>Đã thêm mới: {importResult.inserted}</li>
          <li>Đã cập nhật: {importResult.updated}</li>
          {importResult.failed > 0 ? <li>Lỗi: {importResult.failed}</li> : <></>}
        </ul>
        {importResult.errors.length ? (
          <ul className={styles.errorList}>
            {importResult.errors.map((errorMessage: string) => (
              <li key={errorMessage}>{errorMessage}</li>
            ))}
          </ul>
        ) : (
          <></>
        )}
      </>
    );
  }

  const isBlocking: boolean = step === 'importing';
  const isResultStep: boolean = step === 'result';

  return (
    <>
      <input
        ref={fileInputRef}
        className={styles.fileInput}
        type="file"
        accept=".xlsx,.xls"
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
          handleFileChange(event).catch((error: Error) => {
            setParseError(error.message);
            showToast(error.message, 'error');
          });
        }}
      />

      <ConfirmDialog
        isOpen={props.isOpen}
        title={isResultStep ? 'Kết quả import' : 'Import Excel sản phẩm'}
        isBlocking={isBlocking}
        onDismiss={props.onClose}
        secondaryAction={
          isResultStep || step === 'pickFile'
            ? undefined
            : {
                label: 'Hủy',
                onClick: props.onClose,
                disabled: isBlocking
              }
        }
        primaryAction={
          step === 'pickFile'
            ? {
                label: 'Chọn file',
                onClick: openFilePicker
              }
            : step === 'preview'
            ? {
                label: 'Xác nhận import',
                onClick: (): void => {
                  handleConfirmImport().catch(() => {
                    // handled in catch
                  });
                }
              }
            : {
                label: isResultStep ? 'Đóng' : 'Đang import...',
                loadingLabel: 'Đang import...',
                onClick: props.onClose,
                disabled: isBlocking
              }
        }
      >
        {renderBody()}
      </ConfirmDialog>
    </>
  );
}
