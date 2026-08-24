'use strict';

module.exports = new Proxy(
  {},
  {
    get: function get() {
      return 'mocked-style';
    }
  }
);
