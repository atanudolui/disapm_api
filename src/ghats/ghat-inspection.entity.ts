import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Ghat } from './ghat.entity.js';
import { GhatInspectionPhoto } from './ghat-inspection-photo.entity.js';

export const INSPECTION_AREAS = [
  'approachRoadsPathways',
  'ghatLighting',
  'crowdManagement',
  'safety',
  'policeWomenPolice',
  'cctvPublicAddress',
  'rescueTeam',
  'drinkingWaterSanitation',
  'womenFacilitiesSignage',
  'emergencyResponse',
  'cleanliness',
] as const;

export const FESTIVAL_OCCASIONS = [
  'Durga Puja',
  'Kali Puja',
  'Chhath Puja',
] as const;

export type InspectionArea = (typeof INSPECTION_AREAS)[number];
export type FestivalOccasion = (typeof FESTIVAL_OCCASIONS)[number];
export type ChecklistStatus = 'compliant' | 'deficiency' | 'not_applicable';

export interface ChecklistItem {
  status: ChecklistStatus;
  notes: string;
}

export type InspectionChecklist = Record<InspectionArea, ChecklistItem>;

export interface InspectionDeficiency {
  category: InspectionArea;
  description: string;
  status: 'pending' | 'rectified';
  actionTaken: string;
}

@Entity({ name: 'ghat_inspections' })
export class GhatInspection {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'ghat_id', type: 'uuid' })
  ghatId!: string;

  @ManyToOne(() => Ghat, (ghat) => ghat.inspections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ghat_id' })
  ghat!: Ghat;

  @Column({ name: 'period_start', type: 'date' })
  periodStart!: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd!: string;

  @Column({ type: 'varchar', length: 160 })
  occasion!: string;

  @Column({ type: 'double precision', nullable: true })
  latitude!: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude!: number | null;

  @Column({ type: 'jsonb' })
  checklist!: InspectionChecklist;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  deficiencies!: InspectionDeficiency[];

  @Column({ name: 'inspected_by', type: 'varchar', length: 254 })
  inspectedBy!: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @OneToMany(() => GhatInspectionPhoto, (photo) => photo.inspection)
  photos!: GhatInspectionPhoto[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
