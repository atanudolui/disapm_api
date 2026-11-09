import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GhatInspection } from './ghat-inspection.entity.js';

@Entity({ name: 'ghats' })
export class Ghat {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ name: 'waterbody_type', type: 'varchar', length: 20 })
  waterbodyType!: 'river' | 'pond';

  @Column({ type: 'varchar', length: 120 })
  district!: string;

  @Column({ name: 'sub_division', type: 'varchar', length: 500, default: '' })
  subDivision!: string;

  @Column({ type: 'varchar', length: 160, default: '' })
  block!: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'nodal_officer_name', type: 'varchar', length: 160 })
  nodalOfficerName!: string;

  @Column({ name: 'nodal_officer_contact', type: 'varchar', length: 80 })
  nodalOfficerContact!: string;

  @OneToMany(() => GhatInspection, (inspection) => inspection.ghat)
  inspections!: GhatInspection[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
