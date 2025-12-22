import { User } from 'src/auth/entities/user.entity';
import { Reunion } from 'src/reunions/entities/reunion.entity';
import { List } from 'src/lists/entities/list.entity';
import { Spotify } from 'src/spotify/entities/spotify.entity';
import { Article } from 'src/articles/entities/article.entity';
import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';

export enum ContentType {
    ARTICLE = 'article',
    PHOTOS = 'photos',
    SPOTIFY = 'spotify',
    RADAR = 'radar',
    BEST = 'best',
    VIDEO = 'video',
    REUNION = 'reunion',
}

@Entity('content')
export class Content {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: ContentType,
    })
    type: ContentType;

    @Column('varchar', { length: 200 })
    name: string;

    @Column('text', { nullable: true })
    notes?: string;

    @Column({ type: 'date', nullable: true })
    publicationDate?: Date;

    @Column({ type: 'date', nullable: true })
    closeDate?: Date;

    @ManyToOne(() => User, { eager: true })
    author: User;

    @Column('uuid', { nullable: true })
    reunionId?: string;

    @ManyToOne(() => Reunion, { eager: false, nullable: true })
    @JoinColumn({ name: 'reunionId' })
    reunion?: Reunion;

    @OneToOne(() => List, { nullable: true })
    @JoinColumn()
    list?: List;

    @OneToOne(() => Spotify, (spotify) => spotify.content, { nullable: true })
    @JoinColumn()
    spotify?: Spotify;

    @OneToOne(() => Article, (article) => article.content, { nullable: true })
    @JoinColumn()
    article?: Article;
}
