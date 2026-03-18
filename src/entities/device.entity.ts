import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('devices')
export class Device {

    @PrimaryColumn({ 
        type: 'varchar',
        length: 50
    })
    id: string;

    @Column({
        type: 'varchar',
        length: 100
    })
    name: string;

    @Column({
        type: 'varchar',
        length: 100,
        unique: true
    })
    api_key: string;

    @Column({
        type: 'timestamptz',
        nullable: true
    })
    last_online: Date;

    @CreateDateColumn({
        type: 'timestamptz'
    })
    create_at: Date;
}