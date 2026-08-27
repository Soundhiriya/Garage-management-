package com.garage.config;

import org.flywaydb.core.Flyway;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FlywayConfig {
    @Bean
    Flyway flyway(org.springframework.boot.jdbc.autoconfigure.DataSourceProperties properties) {
        return Flyway.configure()
                .dataSource(properties.determineUrl(), properties.determineUsername(), properties.determinePassword())
                .locations("classpath:db/migration")
                .load();
    }

    @Bean
    String flywayMigrator(Flyway flyway) {
        flyway.repair();
        flyway.migrate();
        return "flywayMigrated";
    }
}
