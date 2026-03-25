import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1774456795872 implements MigrationInterface {
    name = 'InitialSchema1774456795872'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "devices" ("id" character varying(50) NOT NULL, "name" character varying(100) NOT NULL, "api_key" character varying(100) NOT NULL, "last_online" TIMESTAMP WITH TIME ZONE, "create_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_4432e06207d18c2e7cc8e45cd58" UNIQUE ("api_key"), CONSTRAINT "PK_b1514758245c12daf43486dd1f0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "gps_logs" ("id" BIGSERIAL NOT NULL, "deviceId" character varying(50) NOT NULL, "latitude" numeric(9,6) NOT NULL, "longitude" numeric(9,6) NOT NULL, "speed" numeric(6,2) NOT NULL DEFAULT '0', "is_buffered" boolean NOT NULL DEFAULT false, "signal_strength" integer, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, "received_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bf5a0a9cc743b0fb9b4a5bd70b8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_deae94cc3de42132addea70b1f" ON "gps_logs" ("received_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_cc8631d54bd7f7415f684a4cc8" ON "gps_logs" ("deviceId", "timestamp") `);
        await queryRunner.query(`ALTER TABLE "gps_logs" ADD CONSTRAINT "FK_354171cde0acbef172a5a505e05" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "gps_logs" DROP CONSTRAINT "FK_354171cde0acbef172a5a505e05"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cc8631d54bd7f7415f684a4cc8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_deae94cc3de42132addea70b1f"`);
        await queryRunner.query(`DROP TABLE "gps_logs"`);
        await queryRunner.query(`DROP TABLE "devices"`);
    }

}
