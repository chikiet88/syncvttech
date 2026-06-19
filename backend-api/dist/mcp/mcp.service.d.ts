import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SyncService } from '../sync.service';
import { PbxSyncService } from '../pbx-sync.service';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
export declare class McpService implements OnModuleInit {
    private prisma;
    private syncService;
    private pbxSync;
    private readonly logger;
    private activeTransports;
    constructor(prisma: PrismaService, syncService: SyncService, pbxSync: PbxSyncService);
    onModuleInit(): void;
    private createMcpServer;
    private registerTools;
    registerConnection(transport: SSEServerTransport): Promise<void>;
    handleIncomingMessage(sessionId: string, req: any, res: any): Promise<void>;
}
