import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Users } from './users';

@Table({ tableName: 'facebook_credentials', timestamps: true })
export class FacebookCredential extends Model<FacebookCredential> {

  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id: string | undefined;

  @ForeignKey(() => Users)
  @Column({ type: DataType.UUID, allowNull: false, unique: true })
  user_id: string | undefined;

  @BelongsTo(() => Users)
  user!: Users;

  @Column({ type: DataType.STRING, allowNull: true })
  access_token?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  page_id?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  page_name?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  page_access_token?: string;

  @Column({ type: DataType.STRING, allowNull: true })
  insta_business_account_id?: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  is_active?: boolean;
}