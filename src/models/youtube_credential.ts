import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Users } from './users';

@Table({ tableName: 'youtube_credentials', timestamps: true })
export class YouTubeCredential extends Model<YouTubeCredential> {

  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id: string | undefined;

  @ForeignKey(() => Users)
  @Column({ type: DataType.UUID, allowNull: false })
  user_id: string | undefined;

  @BelongsTo(() => Users)
  user!: Users;

  @Column({ type: DataType.STRING, allowNull: true })
  channel_id?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  channel_title?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  access_token?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  refresh_token?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  token_expiry?: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  is_active?: boolean;
}