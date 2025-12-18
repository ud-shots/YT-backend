import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'login_history', timestamps: true })
export class Login_History extends Model<Login_History> {

  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id: string | undefined;

  @Column({ type: DataType.UUID, allowNull: false })
  user_id?: string;

  @Column({ type: DataType.STRING, allowNull: false })
  email?: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  login_token?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  vr?: string;

}