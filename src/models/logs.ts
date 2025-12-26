import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'logs', timestamps: true })
export class Logs extends Model<Logs> {
  @Column({ 
    type: DataType.UUID, 
    defaultValue: DataType.UUIDV4, 
    primaryKey: true 
  })
  id: string | undefined;

  @Column({ 
    type: DataType.STRING, 
    allowNull: true 
  })
  ip_address?: string;

  @Column({ 
    type: DataType.STRING, 
    allowNull: true 
  })
  user_id?: string;

  @Column({ 
    type: DataType.STRING, 
    allowNull: true 
  })
  method?: string;

  @Column({ 
    type: DataType.STRING, 
    allowNull: true 
  })
  url?: string;

  @Column({ 
    type: DataType.INTEGER, 
    allowNull: true 
  })
  status_code?: number;

  @Column({ 
    type: DataType.STRING, 
    allowNull: true 
  })
  error_type?: string;

  @Column({ 
    type: DataType.TEXT, 
    allowNull: true 
  })
  error_message?: string;

  @Column({ 
    type: DataType.TEXT, 
    allowNull: true 
  })
  error_stack?: string;

  @Column({ 
    type: DataType.TEXT, 
    allowNull: true 
  })
  details?: string;

  @Column({ 
    type: DataType.STRING, 
    allowNull: true 
  })
  module?: string;

  @Column({ 
    type: DataType.STRING, 
    allowNull: true 
  })
  action?: string;

  @Column({ 
    type: DataType.JSONB, 
    allowNull: true 
  })
  request_body?: any;

  @Column({ 
    type: DataType.JSONB, 
    allowNull: true 
  })
  request_headers?: any;

  @Column({ 
    type: DataType.STRING, 
    allowNull: true 
  })
  user_agent?: string;

  @Column({ 
    type: DataType.STRING, 
    allowNull: true 
  })
  referrer?: string;
}