import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  health() {
    return {
      name: 'sansan-store-be',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
