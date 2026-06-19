"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var McpController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpController = void 0;
const common_1 = require("@nestjs/common");
const mcp_service_1 = require("./mcp.service");
const sse_js_1 = require("@modelcontextprotocol/sdk/server/sse.js");
let McpController = McpController_1 = class McpController {
    mcpService;
    logger = new common_1.Logger(McpController_1.name);
    API_KEY = process.env.MCP_API_KEY || 'apivttech_mcp_super_secret_key_2026';
    constructor(mcpService) {
        this.mcpService = mcpService;
    }
    validateAuth(req) {
        const authHeader = req.headers?.authorization;
        const queryKey = req.query?.apiKey;
        const token = authHeader?.startsWith('Bearer ')
            ? authHeader.substring(7)
            : queryKey;
        if (!token || token !== this.API_KEY) {
            this.logger.warn(`Unauthorized MCP access attempt from IP: ${req.ip}`);
            throw new common_1.UnauthorizedException('Mã xác thực MCP không chính xác hoặc không được cung cấp.');
        }
    }
    async establishSse(req, res) {
        try {
            this.validateAuth(req);
        }
        catch (err) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const envBaseUrl = process.env.MCP_BASE_URL;
        let absolutePath = '';
        if (envBaseUrl) {
            absolutePath = `${envBaseUrl.replace(/\/$/, '')}/mcp/messages`;
        }
        else {
            const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
            const host = req.headers['x-forwarded-host'] || req.get('host') || 'apivttech.tazagroup.net';
            absolutePath = `${protocol}://${host}/mcp/messages`;
        }
        this.logger.log(`Client establishing SSE connection channel via ${absolutePath}...`);
        const transport = new sse_js_1.SSEServerTransport(absolutePath, res);
        await this.mcpService.registerConnection(transport);
    }
    async receiveMessage(req, res) {
        const sessionId = req.query.sessionId;
        if (!sessionId) {
            res.status(400).end('Missing sessionId parameter');
            return;
        }
        try {
            await this.mcpService.handleIncomingMessage(sessionId, req, res);
        }
        catch (err) {
            this.logger.error(`Error handling incoming message for session ${sessionId}: ${err.message}`);
            if (!res.headersSent) {
                res.status(500).end(err.message);
            }
        }
    }
};
exports.McpController = McpController;
__decorate([
    (0, common_1.Get)('sse'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], McpController.prototype, "establishSse", null);
__decorate([
    (0, common_1.Post)('messages'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], McpController.prototype, "receiveMessage", null);
exports.McpController = McpController = McpController_1 = __decorate([
    (0, common_1.Controller)('mcp'),
    __metadata("design:paramtypes", [mcp_service_1.McpService])
], McpController);
//# sourceMappingURL=mcp.controller.js.map