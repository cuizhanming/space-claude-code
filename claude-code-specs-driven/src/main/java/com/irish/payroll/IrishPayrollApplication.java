package com.irish.payroll;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * Main application class for the Irish Payslips Management System.
 * 
 * This Spring Boot application provides comprehensive payroll management 
 * functionality with Irish tax compliance including PAYE, PRSI, and USC calculations.
 * 
 * Features:
 * - Employee management with Irish PPS number validation
 * - Payroll processing with automated tax calculations
 * - Payslip generation in PDF format
 * - Role-based security and audit logging
 * - Revenue compliance reporting
 * 
 * @author Irish Payroll Development Team
 * @version 1.0.0
 * @since 2025
 */
@SpringBootApplication
@EnableJpaAuditing
@EnableCaching
@EnableAsync
@EnableTransactionManagement
public class IrishPayrollApplication {

    public static void main(String[] args) {
        SpringApplication.run(IrishPayrollApplication.class, args);
    }
}