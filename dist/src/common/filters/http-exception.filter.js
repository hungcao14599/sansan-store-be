"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var HttpExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let HttpExceptionFilter = HttpExceptionFilter_1 = class HttpExceptionFilter {
    logger = new common_1.Logger(HttpExceptionFilter_1.name);
    catch(exception, host) {
        const context = host.switchToHttp();
        const response = context.getResponse();
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            response.status(status).json({
                statusCode: status,
                message: typeof exceptionResponse === 'string'
                    ? exceptionResponse
                    : exceptionResponse.message ??
                        exception.message,
                error: typeof exceptionResponse === 'string'
                    ? exception.name
                    : exceptionResponse.error ?? exception.name,
                timestamp: new Date().toISOString(),
            });
            return;
        }
        if (exception instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            const status = exception.code === 'P2002'
                ? common_1.HttpStatus.CONFLICT
                : exception.code === 'P2025'
                    ? common_1.HttpStatus.NOT_FOUND
                    : common_1.HttpStatus.BAD_REQUEST;
            response.status(status).json({
                statusCode: status,
                message: exception.message,
                error: 'PrismaClientKnownRequestError',
                timestamp: new Date().toISOString(),
            });
            return;
        }
        this.logger.error(exception instanceof Error ? exception.message : 'Unexpected exception', exception instanceof Error ? exception.stack : undefined);
        response.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
            error: 'InternalServerError',
            timestamp: new Date().toISOString(),
        });
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = HttpExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map