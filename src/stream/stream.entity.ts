import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Stream {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  streamKey!: string;

  @Column()
  streamUrl!: string;

  @Column()
  userId!: number;

  @Column()
  createdAt!: Date;

  @Column()
  updatedAt!: Date;
}
