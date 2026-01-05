import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ContentSchedulerService } from './contents/content-scheduler.service';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './winston.config';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: WinstonModule.createLogger(winstonConfig),
    });

    try {
        const scheduler = app.get(ContentSchedulerService);
        const command = process.argv[2];

        switch (command) {
            case 'check-spotify':
                console.log('Running check-spotify...');
                await scheduler.checkMissingSpotifyLinks();
                break;
            case 'create-weekly':
                console.log('Running create-weekly...');
                await scheduler.createWeeklyContent();
                break;
            default:
                console.error('Command not found. Available commands: check-spotify, create-weekly');
                process.exit(1);
        }
    } catch (error) {
        console.error('Error executing command:', error);
        process.exit(1);
    }

    // Ensure logs are flushed before exit if possible, but app.close() handles graceful shutdown
    await app.close();
    process.exit(0);
}

bootstrap();
