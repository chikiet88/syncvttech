import { Controller, Get, Post, Req, Res, UnauthorizedException, Logger } from '@nestjs/common';
import { McpService } from './mcp.service';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

@Controller('mcp')
export class McpController {
  private readonly logger = new Logger(McpController.name);
  private readonly API_KEY = process.env.MCP_API_KEY || 'apivttech_mcp_super_secret_key_2026';

  constructor(private readonly mcpService: McpService) {}

  /**
   * Validate API authentication token
   */
  private validateAuth(req: any) {
    const authHeader = req.headers?.authorization;
    const queryKey = req.query?.apiKey;

    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : queryKey;

    if (!token || token !== this.API_KEY) {
      this.logger.warn(`Unauthorized MCP access attempt from IP: ${req.ip}`);
      throw new UnauthorizedException('Mã xác thực MCP không chính xác hoặc không được cung cấp.');
    }
  }

  /**
   * SSE connection endpoint (GET /mcp/sse)
   * Establishes the real-time event stream channel for Claude
   */
  @Get('sse')
  async establishSse(@Req() req: any, @Res() res: any) {
    try {
      this.validateAuth(req);
    } catch (err) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Determine absolute path for the messages endpoint (supports reverse proxy and custom domain)
    const envBaseUrl = process.env.MCP_BASE_URL;
    let absolutePath = '';
    
    if (envBaseUrl) {
      absolutePath = `${envBaseUrl.replace(/\/$/, '')}/mcp/messages`;
    } else {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.get('host') || 'apivttech.tazagroup.net';
      absolutePath = `${protocol}://${host}/mcp/messages`;
    }

    this.logger.log(`Client establishing SSE connection channel via ${absolutePath}...`);
    
    // SSEServerTransport takes the POST path for receiving client messages
    const transport = new SSEServerTransport(absolutePath, res);
    
    await this.mcpService.registerConnection(transport);
  }

  /**
   * Messages post endpoint (POST /mcp/messages)
   * Receives tools call payloads and runs them on the bound SSE session
   */
  @Post('messages')
  async receiveMessage(@Req() req: any, @Res() res: any) {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      res.status(400).end('Missing sessionId parameter');
      return;
    }

    try {
      await this.mcpService.handleIncomingMessage(sessionId, req, res);
    } catch (err: any) {
      this.logger.error(`Error handling incoming message for session ${sessionId}: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).end(err.message);
      }
    }
  }
}
