import { McpService } from './mcp.service';
export declare class McpController {
    private readonly mcpService;
    private readonly logger;
    private readonly API_KEY;
    constructor(mcpService: McpService);
    private validateAuth;
    establishSse(req: any, res: any): Promise<void>;
    receiveMessage(req: any, res: any): Promise<void>;
}
