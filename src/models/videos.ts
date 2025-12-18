import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Users } from './users';

@Table({ tableName: 'videos', timestamps: true })
export class Videos extends Model {

  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id: string | undefined;

  @ForeignKey(() => Users)
  @Column({ type: DataType.UUID, allowNull: false })
  user_id?: string;

  @BelongsTo(() => Users)
  user!: Users;

  @Column({ type: DataType.STRING, allowNull: false })
  filename?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  original_url?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  local_path?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  youtube_video_id?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  title?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description?: string;

  @Column({ type: DataType.ARRAY(DataType.STRING), allowNull: true })
  tags?: string[];

  @Column({ type: DataType.ARRAY(DataType.STRING), allowNull: true })
  keywords?: string[];

  @Column({ type: DataType.ARRAY(DataType.STRING), allowNull: true })
  hashtags?: string[];

  @Column({ type: DataType.ENUM('public', 'private', 'unlisted'), allowNull: true })
  visibility?: 'public' | 'private' | 'unlisted';

  @Column({ type: DataType.ENUM('draft', 'uploading', 'processing', 'checking', 'published', 'scheduled', 'blocked'), allowNull: false, defaultValue: 'draft' })
  status?: 'draft' | 'uploading' | 'processing' | 'checking' | 'published' | 'scheduled' | 'blocked';

  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 0 })
  progress?: number;

  @Column({ type: DataType.STRING, allowNull: true })
  scheduled_at?: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  published_at?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  rejection_reason?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  thumbnail_url?: string;

  @Column({ type: DataType.BIGINT, allowNull: true, defaultValue: 0 })
  views?: number;

  @Column({ type: DataType.BIGINT, allowNull: true, defaultValue: 0 })
  likes?: number;

  @Column({ type: DataType.BIGINT, allowNull: true, defaultValue: 0 })
  comments?: number;
}