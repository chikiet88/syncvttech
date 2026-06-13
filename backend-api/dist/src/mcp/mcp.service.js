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
var McpService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const sync_service_1 = require("../sync.service");
const pbx_sync_service_1 = require("../pbx-sync.service");
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
let McpService = McpService_1 = class McpService {
    prisma;
    syncService;
    pbxSync;
    logger = new common_1.Logger(McpService_1.name);
    activeTransports = new Map();
    constructor(prisma, syncService, pbxSync) {
        this.prisma = prisma;
        this.syncService = syncService;
        this.pbxSync = pbxSync;
    }
    onModuleInit() {
        this.logger.log('Initializing Model Context Protocol (MCP) Server for Apivttech... (Per-connection mode)');
    }
    createMcpServer() {
        const server = new index_js_1.Server({
            name: 'apivttech-auto-mcp',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.registerTools(server);
        return server;
    }
    registerTools(mcpServer) {
        mcpServer.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'list_branches',
                        description: 'Lấy danh sách các chi nhánh đang hoạt động kèm thông tin chi tiết.',
                        inputSchema: { type: 'object', properties: {} },
                    },
                    {
                        name: 'get_sync_status',
                        description: 'Kiểm tra trạng thái đồng bộ hiện tại và hàng đợi BullMQ của hệ thống.',
                        inputSchema: { type: 'object', properties: {} },
                    },
                    {
                        name: 'get_sync_logs',
                        description: 'Lấy lịch sử logs đồng bộ CRM (CRM/Pbx) hoặc báo cáo tự động gần nhất.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                limit: { type: 'number', description: 'Số lượng bản ghi log cần lấy (mặc định: 10)' },
                                type: { type: 'string', description: 'Loại log cần lấy: crm (Đồng bộ CRM), pbx (Đồng bộ PBX), daily_report (Báo cáo tự động hàng ngày)' }
                            }
                        },
                    },
                    {
                        name: 'trigger_sync_range',
                        description: 'Kích hoạt chạy ngầm đồng bộ toàn diện dữ liệu CRM theo khoảng ngày.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                from: { type: 'string', description: 'Ngày bắt đầu định dạng YYYY-MM-DD' },
                                to: { type: 'string', description: 'Ngày kết thúc định dạng YYYY-MM-DD' },
                                forceMaster: { type: 'boolean', description: 'Có ép buộc đồng bộ lại dữ liệu danh mục hay không (mặc định: false)' },
                                syncPbx: { type: 'boolean', description: 'Có đồng bộ dữ liệu cuộc gọi PBX hay không (mặc định: false)' },
                                syncDetails: { type: 'boolean', description: 'Có đồng bộ chi tiết khách hàng và thẻ dịch vụ hay không (mặc định: true)' }
                            },
                            required: ['from', 'to']
                        },
                    },
                    {
                        name: 'trigger_revenue_sync',
                        description: 'Kích hoạt chạy ngầm đồng bộ chỉ doanh thu CRM theo khoảng ngày.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                from: { type: 'string', description: 'Ngày bắt đầu định dạng YYYY-MM-DD' },
                                to: { type: 'string', description: 'Ngày kết thúc định dạng YYYY-MM-DD' }
                            },
                            required: ['from', 'to']
                        },
                    },
                    {
                        name: 'query_postgres',
                        description: 'Truy vấn cơ sở dữ liệu PostgreSQL qua các câu lệnh SELECT an toàn (Chỉ đọc).',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                sql: { type: 'string', description: 'Câu lệnh SELECT SQL đầy đủ để chạy truy vấn.' }
                            },
                            required: ['sql']
                        },
                    }
                ]
            };
        });
        mcpServer.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            this.logger.log(`MCP Tool called: ${name} with args: ${JSON.stringify(args)}`);
            try {
                switch (name) {
                    case 'list_branches': {
                        const branches = await this.prisma.branch.findMany({
                            where: { is_active: 1 },
                            orderBy: { name: 'asc' }
                        });
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        success: true,
                                        total: branches.length,
                                        branches
                                    }, null, 2)
                                }
                            ]
                        };
                    }
                    case 'get_sync_status': {
                        const status = await this.syncService.getSyncStatus();
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({ success: true, status }, null, 2)
                                }
                            ]
                        };
                    }
                    case 'get_sync_logs': {
                        const limit = Number(args?.limit) || 10;
                        const logType = String(args?.type || 'crm');
                        if (logType === 'pbx') {
                            const logs = await this.prisma.pbxSyncLog.findMany({
                                take: limit,
                                orderBy: { created_at: 'desc' }
                            });
                            return {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify({ success: true, type: logType, logs }, null, 2)
                                    }
                                ]
                            };
                        }
                        else if (logType === 'daily_report') {
                            const logs = await this.prisma.crawlLog.findMany({
                                where: { crawl_type: 'DAILY_REPORT' },
                                take: limit,
                                orderBy: { created_at: 'desc' }
                            });
                            return {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify({ success: true, type: logType, logs }, null, 2)
                                    }
                                ]
                            };
                        }
                        else {
                            const logs = await this.prisma.crawlLog.findMany({
                                where: { NOT: { crawl_type: 'DAILY_REPORT' } },
                                take: limit,
                                orderBy: { created_at: 'desc' }
                            });
                            return {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify({ success: true, type: logType, logs }, null, 2)
                                    }
                                ]
                            };
                        }
                    }
                    case 'trigger_sync_range': {
                        const from = String(args?.from);
                        const to = String(args?.to);
                        const forceMaster = Boolean(args?.forceMaster);
                        const syncPbx = Boolean(args?.syncPbx);
                        const syncDetails = args?.syncDetails !== false;
                        this.syncService.syncByRange(from, to, forceMaster, syncPbx, syncDetails).catch(err => {
                            this.logger.error(`Manual range sync triggered via MCP failed: ${err.message}`);
                        });
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        success: true,
                                        message: `Tiến trình đồng bộ từ ${from} đến ${to} đã được kích hoạt chạy ngầm.`
                                    }, null, 2)
                                }
                            ]
                        };
                    }
                    case 'trigger_revenue_sync': {
                        const from = String(args?.from);
                        const to = String(args?.to);
                        this.syncService.syncRevenue(from, to).catch(err => {
                            this.logger.error(`Manual revenue sync triggered via MCP failed: ${err.message}`);
                        });
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        success: true,
                                        message: `Tiến trình đồng bộ doanh thu từ ${from} đến ${to} đã được kích hoạt chạy ngầm.`
                                    }, null, 2)
                                }
                            ]
                        };
                    }
                    case 'query_postgres': {
                        const sql = String(args?.sql || '').trim();
                        if (!sql.toLowerCase().startsWith('select')) {
                            return {
                                isError: true,
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Lỗi bảo mật: Chỉ cho phép các câu lệnh truy vấn bắt đầu bằng "SELECT" (Chỉ đọc).'
                                    }
                                ]
                            };
                        }
                        const result = await this.prisma.$queryRawUnsafe(sql);
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({ success: true, count: Array.isArray(result) ? result.length : 0, data: result }, null, 2)
                                }
                            ]
                        };
                    }
                    default:
                        return {
                            isError: true,
                            content: [{ type: 'text', text: `Không tìm thấy công cụ MCP nào tên là: ${name}` }]
                        };
                }
            }
            catch (err) {
                this.logger.error(`Error executing MCP tool ${name}: ${err.message}`);
                return {
                    isError: true,
                    content: [{ type: 'text', text: `Lỗi thực thi công cụ: ${err.message}` }]
                };
            }
        });
    }
    async registerConnection(transport) {
        const sessionId = transport.sessionId;
        this.activeTransports.set(sessionId, transport);
        const mcpServer = this.createMcpServer();
        transport.onclose = async () => {
            this.logger.log(`MCP client transport connection closed: ${sessionId}`);
            this.activeTransports.delete(sessionId);
            transport.onclose = undefined;
            try {
                await mcpServer.close();
            }
            catch (err) {
            }
        };
        this.logger.log(`New MCP client transport registered: ${sessionId}`);
        await mcpServer.connect(transport);
    }
    async handleIncomingMessage(sessionId, req, res) {
        const transport = this.activeTransports.get(sessionId);
        if (!transport) {
            res.writeHead(404).end('Session not found or connection expired');
            return;
        }
        await transport.handlePostMessage(req, res, req.body);
    }
};
exports.McpService = McpService;
exports.McpService = McpService = McpService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        sync_service_1.SyncService,
        pbx_sync_service_1.PbxSyncService])
], McpService);
//# sourceMappingURL=mcp.service.js.map