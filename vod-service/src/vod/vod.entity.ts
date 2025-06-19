import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Vod {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  streamKey!: string;

  @Column()
  filePath!: string;

  @Column()
  createdAt!: Date;

  @Column({ default: false })
  downloadable!: boolean;
}
