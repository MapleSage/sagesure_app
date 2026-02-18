import { logger } from './logger';

describe('Logger', () => {
  it('should be defined', () => {
    expect(logger).toBeDefined();
  });

  it('should have required log methods', () => {
    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.debug).toBeDefined();
  });

  it('should log info messages without throwing', () => {
    expect(() => {
      logger.info('Test info message');
    }).not.toThrow();
  });

  it('should log error messages without throwing', () => {
    expect(() => {
      logger.error('Test error message');
    }).not.toThrow();
  });
});
