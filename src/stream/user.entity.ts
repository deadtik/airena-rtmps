import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  firebaseId!: string;

  @Column({ unique: true, nullable: true })
  streamKey!: string;

  @Column({ nullable: true })
  streamUrl!: string;

  @Column({ default: false })
  isStreaming!: boolean;

  @Column({ type: 'json', nullable: true })
  streamSettings!: {
    quality?: string;
    maxBitrate?: number;
    resolution?: string;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
} 