import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LoggerService } from './logger.service.js';

describe('LoggerService', () => {
  let loggerService: LoggerService;
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should create logger in production mode', () => {
    process.env.NODE_ENV = 'production';
    loggerService = new LoggerService();
    expect(loggerService).toBeDefined();
  });

  it('should create logger in development mode', () => {
    process.env.NODE_ENV = 'development';
    loggerService = new LoggerService();
    expect(loggerService).toBeDefined();
  });

  it('should create logger in test mode', () => {
    process.env.NODE_ENV = 'test';
    loggerService = new LoggerService();
    expect(loggerService).toBeDefined();
  });

  it('should call log() without throwing', () => {
    process.env.NODE_ENV = 'test';
    loggerService = new LoggerService();
    expect(() => loggerService.log('test message', { key: 'value' })).not.toThrow();
  });

  it('should call error() without throwing', () => {
    process.env.NODE_ENV = 'test';
    loggerService = new LoggerService();
    expect(() =>
      loggerService.error('error message', 'stack trace', { key: 'value' }),
    ).not.toThrow();
  });

  it('should call warn() without throwing', () => {
    process.env.NODE_ENV = 'test';
    loggerService = new LoggerService();
    expect(() => loggerService.warn('warning message', { key: 'value' })).not.toThrow();
  });

  it('should call debug() without throwing', () => {
    process.env.NODE_ENV = 'test';
    loggerService = new LoggerService();
    expect(() => loggerService.debug('debug message', { key: 'value' })).not.toThrow();
  });

  it('should handle log() without context', () => {
    process.env.NODE_ENV = 'test';
    loggerService = new LoggerService();
    expect(() => loggerService.log('test message')).not.toThrow();
  });

  it('should handle error() without trace', () => {
    process.env.NODE_ENV = 'test';
    loggerService = new LoggerService();
    expect(() => loggerService.error('error message')).not.toThrow();
  });

  it('should handle error() without context', () => {
    process.env.NODE_ENV = 'test';
    loggerService = new LoggerService();
    expect(() => loggerService.error('error message', 'trace')).not.toThrow();
  });
});
