import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class PbxApiService {
  private readonly logger = new Logger(PbxApiService.name);
  private readonly apiUrl: string;
  private readonly domain: string;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('PBX_API_URL') || '';
    this.domain = this.configService.get<string>('PBX_DOMAIN') || '';
    this.apiKey = this.configService.get<string>('PBX_API_KEY') || '';
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  async fetchCdrRecords(dateFrom: string, dateTo: string, offset: number = 0) {
    const fromStr = `${dateFrom} 00:00:00`;
    const toStr = `${dateTo} 23:59:59`;

    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          domain: this.domain,
          from: fromStr,
          to: toStr,
          limit: 100,
          offset: offset,
        },
        headers: this.getHeaders(),
      });

      if (response.status === 200) {
        return response.data;
      } else {
        this.logger.error(`PBX API error: ${response.status} - ${response.statusText}`);
        return { data: [], total: 0 };
      }
    } catch (error) {
      this.logger.error(`Error fetching PBX CDR records: ${error.message}`);
      return { data: [], total: 0 };
    }
  }

  async fetchAllCdrRecords(dateFrom: string, dateTo: string) {
    let allRecords = [];
    let offset = 0;

    while (true) {
      const result = await this.fetchCdrRecords(dateFrom, dateTo, offset);
      const records = result.data || [];
      
      if (records.length === 0) break;

      allRecords.push(...records);
      
      const nextOffset = result.next_offset;
      if (nextOffset === undefined || nextOffset <= offset) break;
      
      offset = nextOffset;
    }

    return allRecords;
  }
}
