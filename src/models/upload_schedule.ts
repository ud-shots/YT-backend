import { Table, Column, Model, DataType, ForeignKey } from 'sequelize-typescript';
import { Users } from './users';

@Table({ tableName: 'upload_schedules', timestamps: true })
export class UploadSchedule extends Model<UploadSchedule> {

  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id: string | undefined;

  @ForeignKey(() => Users)
  @Column({ type: DataType.UUID, allowNull: false })
  user_id?: string;

  @Column({ type: DataType.STRING, allowNull: false })
  day?: string; // monday, tuesday, etc.

  @Column({ type: DataType.TIME, allowNull: false })
  start_time?: string; // HH:mm format

  @Column({ type: DataType.TIME, allowNull: false })
  end_time?: string; // HH:mm format

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 1 })
  max_uploads?: number;

  @Column({ type: DataType.STRING, allowNull: true })
  slot_name?: string; // morning, afternoon, evening, etc.

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  is_active?: boolean;
}