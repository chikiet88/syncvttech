import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SyncService } from '../sync.service';
import { PbxSyncService } from '../pbx-sync.service';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

@Injectable()
export class McpService implements OnModuleInit {
  private readonly logger = new Logger(McpService.name);
  private activeTransports = new Map<string, SSEServerTransport>();

  constructor(
    private prisma: PrismaService,
    private syncService: SyncService,
    private pbxSync: PbxSyncService,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing Model Context Protocol (MCP) Server for Apivttech... (Per-connection mode)');
  }

  private createMcpServer(): Server {
    const server = new Server(
      {
        name: 'apivttech-auto-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.registerTools(server);
    return server;
  }

  private registerTools(mcpServer: Server) {
    // 1. List all available tools
    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
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

    // 2. Handle calling of tools
    mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
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
            const limit = Number((args as any)?.limit) || 10;
            const logType = String((args as any)?.type || 'crm');

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
            } else if (logType === 'daily_report') {
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
            } else {
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
            const from = String((args as any)?.from);
            const to = String((args as any)?.to);
            const forceMaster = Boolean((args as any)?.forceMaster);
            const syncPbx = Boolean((args as any)?.syncPbx);
            const syncDetails = (args as any)?.syncDetails !== false;

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
            const from = String((args as any)?.from);
            const to = String((args as any)?.to);

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
            const sql = String((args as any)?.sql || '').trim();
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
      } catch (err: any) {
        this.logger.error(`Error executing MCP tool ${name}: ${err.message}`);
        return {
          isError: true,
          content: [{ type: 'text', text: `Lỗi thực thi công cụ: ${err.message}` }]
        };
      }
    });
  }

  /**
   * Register a new SSE client connection and handle transport binding
   */
  async registerConnection(transport: SSEServerTransport) {
    const sessionId = transport.sessionId;
    this.activeTransports.set(sessionId, transport);
    
    const mcpServer = this.createMcpServer();

    transport.onclose = async () => {
      this.logger.log(`MCP client transport connection closed: ${sessionId}`);
      this.activeTransports.delete(sessionId);
      transport.onclose = undefined; // Prevent recursive loop
      try {
        await mcpServer.close();
      } catch (err) {
        // Ignore close errors
      }
    };

    this.logger.log(`New MCP client transport registered: ${sessionId}`);
    await mcpServer.connect(transport);
  }

  /**
   * Handle incoming POST message for a given session
   */
  async handleIncomingMessage(sessionId: string, req: any, res: any) {
    const transport = this.activeTransports.get(sessionId);
    if (!transport) {
      res.writeHead(404).end('Session not found or connection expired');
      return;
    }
    await transport.handlePostMessage(req, res, req.body);
  }
}
