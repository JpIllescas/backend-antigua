import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSignaFields1774318517667 implements MigrationInterface {
    name = 'AddSignaFields1774318517667'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "gps_logs" DROP COLUMN "satellite_ts"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "gps_logs" ADD "satellite_ts" character varying(30)`);
    }

}
