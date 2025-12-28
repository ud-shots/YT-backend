import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'logs', timestamps: true })
export class Logs extends Model<Logs> {

  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id: string | undefined;

  @Column({ type: DataType.STRING, allowNull: true })
  user_id?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  upload_pendin_media_id?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  error_message?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  platform?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  time?: string;

}