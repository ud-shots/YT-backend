import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Users } from './users';
import { UploadSchedule } from './upload_schedule';

@Table({ tableName: 'pending_upload_media', timestamps: true })
export class Pending_Uplaod_Media extends Model<Pending_Uplaod_Media> {

  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id: string | undefined;

  @ForeignKey(() => Users)
  @Column({ type: DataType.UUID, allowNull: false })
  user_id?: string;

  @Column({ type: DataType.ENUM('file', 'url'), allowNull: false })
  type?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  url?: string;

  @Column({ type: DataType.ENUM('image', 'video'), allowNull: true })
  media_type?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  file_name?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  file_type?: string;

  @Column({ type: DataType.ENUM('public', 'unlisted', 'private'), allowNull: false, defaultValue: 'public' })
  visibility?: string;

  @Column({ type: DataType.ENUM('instagram', 'facebook', 'youtube', 'unknown'), allowNull: false, defaultValue: 'unknown' })
  platform?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  schedule_date?: string;

  @Column({ type: DataType.ENUM('initiate', 'pending', 'success', 'failed', 'uploading'), allowNull: false, defaultValue: 'initiate' })
  status?: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  uploaded_insta?: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  uploaded_facebook?: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  uploaded_youtube?: boolean;

  @BelongsTo(() => UploadSchedule, { foreignKey: 'upload_schedule_id', as: 'schedule' })
  upload_schedule?: UploadSchedule;

}