import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { GhatInspection } from './ghat-inspection.entity.js';

export interface UploadedInspectionPhoto {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Entity({ name: 'ghat_inspection_photos' })
export class GhatInspectionPhoto {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'inspection_id', type: 'uuid' })
  inspectionId!: string;

  @ManyToOne(() => GhatInspection, (inspection) => inspection.photos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'inspection_id' })
  inspection!: Relation<GhatInspection>;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 50 })
  mimeType!: string;

  @Column({ type: 'integer' })
  size!: number;

  @Column({ type: 'bytea', select: false })
  data!: Buffer;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
