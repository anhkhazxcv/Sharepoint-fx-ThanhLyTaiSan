import * as React from 'react';
import type { TProcessStep } from './types';
import styles from './ProcessStepper.module.scss';

export interface IProcessStepperProps {
  currentStep: TProcessStep;
}

const steps: TProcessStep[] = ['Đăng ký', 'Thanh toán', 'Bàn giao', 'Hoàn tất'];

export function ProcessStepper(props: IProcessStepperProps): React.ReactElement {
  const currentIndex: number = steps.indexOf(props.currentStep);

  return (
    <section className={styles.stepperCard}>
      <div className={styles.track}>
        {steps.map(function (step: TProcessStep, index: number): React.ReactElement {
          const isDone: boolean = index < currentIndex;
          const isActive: boolean = index === currentIndex;

          return (
            <div key={step} className={styles.stepItem}>
              <div className={styles.stepWrap}>
                <span
                  className={
                    styles.stepCircle +
                    ' ' +
                    (isDone ? styles.stepDone : '') +
                    ' ' +
                    (isActive ? styles.stepActive : '')
                  }
                >
                  {index + 1}
                </span>
                <span className={styles.stepLabel}>{step}</span>
              </div>
              {index < steps.length - 1 && (
                <span
                  className={styles.stepLine + ' ' + (index < currentIndex ? styles.stepLineActive : '')}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
