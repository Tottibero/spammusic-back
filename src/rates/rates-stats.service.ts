import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { Rate } from './entities/rate.entity';
import { User } from 'src/auth/entities/user.entity';

@Injectable()
export class RatesStatsService {
    private readonly logger = new Logger('RatesStatsService');

    constructor(
        @InjectRepository(Rate)
        private readonly rateRepository: Repository<Rate>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async getUserStats(user: User, year?: string) {
        const userId = user.id;
        const filterYear = year || new Date().getFullYear().toString();

        // 1. Total de votos (rates) - filtered by year
        const totalVotesResult = await this.rateRepository
            .createQueryBuilder('rate')
            .where('rate.userId = :userId', { userId })
            .andWhere('rate.rate IS NOT NULL')
            .andWhere("TO_CHAR(rate.createdAt, 'YYYY') = :filterYear", { filterYear })
            .getCount();
        const totalVotes = totalVotesResult;

        // 2. Votos por género - filtered by year
        const votesByGenre = await this.rateRepository
            .createQueryBuilder('rate')
            .innerJoin('rate.disc', 'disc')
            .innerJoin('disc.genre', 'genre')
            .select('genre.name', 'genre')
            .addSelect('COUNT(rate.id)', 'count')
            .where('rate.userId = :userId', { userId })
            .andWhere('rate.rate IS NOT NULL')
            .andWhere("TO_CHAR(rate.createdAt, 'YYYY') = :filterYear", { filterYear })
            .groupBy('genre.name')
            .getRawMany();

        // Mapear resultados para asegurar formato numérico en count
        const formattedVotesByGenre = votesByGenre.map((item) => ({
            genre: item.genre,
            count: parseInt(item.count, 10),
        }));

        // 3. Votos por mes y semana en el año especificado
        const votesByMonthRaw = await this.rateRepository
            .createQueryBuilder('rate')
            .select("TO_CHAR(rate.createdAt, 'Month')", 'month')
            .addSelect("EXTRACT(MONTH FROM rate.createdAt)", 'month_num')
            .addSelect("TO_CHAR(rate.createdAt, 'W')", 'week')
            .addSelect('COUNT(rate.id)', 'count')
            .where('rate.userId = :userId', { userId })
            .andWhere('rate.rate IS NOT NULL')
            .andWhere("TO_CHAR(rate.createdAt, 'YYYY') = :filterYear", { filterYear })
            .groupBy('month')
            .addGroupBy('month_num')
            .addGroupBy('week')
            .orderBy('month_num', 'ASC')
            .addOrderBy('week', 'ASC')
            .getRawMany();

        // Agrupar por mes y luego por semana
        const votesByMonthMap = new Map<string, { month: string; count: number; weeks: { week: string; count: number }[] }>();

        votesByMonthRaw.forEach((item) => {
            const month = item.month.trim();
            const count = parseInt(item.count, 10);
            const week = item.week;

            if (!votesByMonthMap.has(month)) {
                votesByMonthMap.set(month, {
                    month,
                    count: 0,
                    weeks: [],
                });
            }

            const monthEntry = votesByMonthMap.get(month);
            monthEntry.count += count;
            monthEntry.weeks.push({
                week: week,
                count: count,
            });
        });

        const formattedVotesByMonth = Array.from(votesByMonthMap.values());

        // 4. Media y Mediana - filtered by year
        const stats = await this.rateRepository
            .createQueryBuilder('rate')
            .select('AVG(rate.rate)', 'mean')
            .addSelect('PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY rate.rate)', 'median')
            .where('rate.userId = :userId', { userId })
            .andWhere('rate.rate IS NOT NULL')
            .andWhere("TO_CHAR(rate.createdAt, 'YYYY') = :filterYear", { filterYear })
            .getRawOne();

        const mean = stats && stats.mean ? parseFloat(stats.mean).toFixed(2) : 0;
        const median = stats && stats.median ? parseFloat(stats.median) : 0;

        // 5. Desglose de votos (0-10) - filtered by year
        const votesByScoreRaw = await this.rateRepository
            .createQueryBuilder('rate')
            .select('rate.rate', 'score')
            .addSelect('COUNT(rate.id)', 'count')
            .where('rate.userId = :userId', { userId })
            .andWhere('rate.rate IS NOT NULL')
            .andWhere("TO_CHAR(rate.createdAt, 'YYYY') = :filterYear", { filterYear })
            .groupBy('rate.rate')
            .orderBy('rate.rate', 'ASC')
            .getRawMany();

        // Inicializar array con 0s para todos los scores del 0 al 10
        const votesByScore = Array.from({ length: 11 }, (_, i) => ({
            score: i,
            count: 0,
        }));

        // Rellenar con los datos reales
        votesByScoreRaw.forEach((item) => {
            const score = Math.floor(parseFloat(item.score));
            const count = parseInt(item.count, 10);
            if (score >= 0 && score <= 10) {
                votesByScore[score].count += count;
            }
        });

        // 6. Total Usuarios y Ranking
        const totalUsers = await this.userRepository.count();

        // Ranking: Contar cuántos usuarios tienen más votos que el usuario actual
        const usersWithMoreVotesRaw = await this.rateRepository
            .createQueryBuilder('rate')
            .select('rate.user.id')
            .where('rate.rate IS NOT NULL')
            .groupBy('rate.user.id')
            .having('COUNT(rate.id) > :totalVotes', { totalVotes })
            .getRawMany();

        const rank = usersWithMoreVotesRaw.length + 1;

        return {
            totalVotes,
            mean,
            median,
            votesByGenre: formattedVotesByGenre,
            votesByMonth: formattedVotesByMonth,
            votesByScore,
            totalUsers,
            rank,
        };
    }
}
