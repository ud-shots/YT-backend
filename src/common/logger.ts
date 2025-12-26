import { Logs } from '../models/logs';
import { Request } from 'express';

interface LogData {
    ip_address?: string;
    user_id?: string;
    method?: string;
    url?: string;
    status_code?: number;
    error_type?: string;
    error_message?: string;
    error_stack?: string;
    details?: string;
    module?: string;
    action?: string;
    request_body?: any;
    request_headers?: any;
    user_agent?: string;
    referrer?: string;
}

class Logger {
    /**
     * Log an error with detailed information
     */
    static async logError(error: any, req: any, module: string, action: string, details?: string): Promise<void> {
        try {
            const logData: any = {
                ip_address: this.getClientIP(req),
                user_id: req.userId || (req as any).userId,
                method: req.method,
                url: req.url,
                status_code: error.statusCode || error.status || 500,
                error_type: error.name || typeof error,
                error_message: error.message || String(error),
                error_stack: error.stack || new Error().stack,
                details: details || error.details || 'Error occurred during processing',
                module,
                action,
                request_body: req.body,
                request_headers: req.headers,
                user_agent: 'unknow',
                referrer: 'unknow',
            };

            await Logs.create(logData);
        } catch (logError) {
            console.error('Error logging failed:', logError);
        }
    }

    /**
     * Log general information
     */
    static async logInfo(module: string, action: string, details: string, req?: Request, user_id?: string): Promise<void> {
        try {
            const logData: any = {
                ip_address: req ? this.getClientIP(req) : undefined,
                user_id: user_id || (req ? (req.userId || (req as any).userId) : undefined),
                method: req?.method,
                url: req?.url,
                status_code: 200,
                error_type: 'INFO',
                error_message: 'Informational log',
                details,
                module,
                action,
                request_body: req?.body,
                request_headers: req?.headers,
                user_agent: req?.get('User-Agent') || '',
                referrer: req?.get('Referer') || req?.get('Referrer') || '',
            };

            await Logs.create(logData);
        } catch (logError) {
            console.error('Info logging failed:', logError);
        }
    }

    /**
     * Log a warning
     */
    static async logWarning(error: any, req: Request, module: string, action: string, details?: string): Promise<void> {
        try {
            const logData: any = {
                ip_address: this.getClientIP(req),
                user_id: req.userId || (req as any).userId,
                method: req.method,
                url: req.url,
                status_code: 400,
                error_type: 'WARNING',
                error_message: error.message || String(error),
                error_stack: error.stack || new Error().stack,
                details: details || 'Warning occurred during processing',
                module,
                action,
                request_body: req.body,
                request_headers: req.headers,
                 user_agent: 'unknown',
                referrer: 'unknown',
            };

            await Logs.create(logData);
        } catch (logError) {
            console.error('Warning logging failed:', logError);
        }
    }

    /**
     * Get client IP address from request
     */
    private static getClientIP(req: Request): string {
        return '127.0.0.1'
    }

    /**
     * Log API request/response
     */
    static async logAPIRequest(
        req: Request,
        statusCode: number,
        module: string,
        action: string,
        details?: string
    ): Promise<void> {
        try {
            const logData: any = {
                ip_address: this.getClientIP(req),
                user_id: req.userId || (req as any).userId,
                method: req.method,
                url: req.url,
                status_code: statusCode,
                error_type: statusCode >= 400 ? 'ERROR' : 'SUCCESS',
                error_message: statusCode >= 400 ? `Request failed with status ${statusCode}` : 'Request successful',
                details: details || `API ${statusCode >= 400 ? 'error' : 'success'} - ${module} ${action}`,
                module,
                action,
                request_body: req.body,
                request_headers: req.headers,
                user_agent: 'unknown',
                referrer: 'unknown',
            };

            await Logs.create(logData);
        } catch (logError) {
            console.error('API request logging failed:', logError);
        }
    }
}

export default Logger;