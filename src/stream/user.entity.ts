import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  firebaseId!: string;

  @Column({ type: 'varchar', length: 255 })
  streamKey!: string;

  @Column({ type: 'varchar', length: 255 })
  streamUrl!: string;

  @Column({ default: false })
  isStreaming!: boolean;

  @Column({ type: 'text', nullable: true })
  streamSettings!: string; // stored as JSON string

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
