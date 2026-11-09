import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type UserRole = 'user' | 'admin';

@Entity({ name: 'users' })
export class User {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 60 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 20, default: 'user' })
  role!: UserRole;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
