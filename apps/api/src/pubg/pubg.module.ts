import { Global, Module } from '@nestjs/common';
import { PubgService } from './pubg.service';

@Global()
@Module({
  providers: [PubgService],
  exports: [PubgService],
})
export class PubgModule {}
