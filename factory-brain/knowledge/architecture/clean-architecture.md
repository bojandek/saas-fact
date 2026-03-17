# Clean Architecture & Multi-Tenant RLS Best Practices

This document outlines best practices for implementing Clean Architecture principles and robust Multi-Tenant Row Level Security (RLS) in SaaS applications, guiding the Architect Agent in generating high-quality, scalable, and secure system designs.

## Clean Architecture Principles:

Clean Architecture, as advocated by Robert C. Martin (Uncle Bob), emphasizes separation of concerns, making systems independent of frameworks, UI, database, and external agencies. This leads to systems that are:

1.  **Independent of Frameworks**: The architecture does not depend on the existence of some library of feature-laden software. This allows you to use frameworks as tools, rather than having to contort your system into their limited strictures.
2.  **Testable**: Business rules can be tested without the UI, database, web server, or any other external element.
3.  **Independent of UI**: The UI can change easily, without changing the rest of the system. A web UI can be replaced with a console UI, for example, without changing the business rules.
4.  **Independent of Database**: You can swap out your database (e.g., from PostgreSQL to MySQL) without affecting your business rules.
5.  **Independent of any External Agency**: Your business rules don't know anything about the outside world.

### Key Layers:

-   **Entities**: Encapsulate Enterprise-wide business rules. These are the core business objects.
-   **Use Cases (Interactors)**: Contain application-specific business rules. They orchestrate the flow of data to and from the Entities, and direct the Entities to use their Enterprise-wide business rules to achieve the Use Case's goal.
-   **Interface Adapters**: Convert data from the format most convenient for the Use Cases and Entities, to the format most convenient for some external agency (e.g., Database, Web, UI).
-   **Frameworks & Drivers**: The outermost layer, composed of frameworks and tools like the Database, Web Framework, UI, etc.

## Multi-Tenant RLS Best Practices:

Row Level Security (RLS) is crucial for multi-tenant SaaS applications to ensure data isolation between tenants. The goal is that a user from Tenant A can *never* access data belonging to Tenant B.

1.  **`tenant_id` Column**: Every table that stores tenant-specific data *must* have a `tenant_id` column. This is the primary key for RLS.
2.  **Enable RLS**: RLS must be explicitly enabled on all tenant-specific tables:
    ```sql
    ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;
    ```
3.  **Policy for `SELECT`**: The most common policy restricts `SELECT` operations to rows where `tenant_id` matches the current user's tenant:
    ```sql
    CREATE POLICY "tenant_isolation_select" ON public.your_table
      FOR SELECT
      USING (tenant_id = get_current_tenant_id());
    ```
4.  **Policy for `INSERT`**: Ensure new records are automatically assigned the correct `tenant_id` and that users cannot insert data into other tenants:
    ```sql
    CREATE POLICY "tenant_isolation_insert" ON public.your_table
      FOR INSERT
      WITH CHECK (tenant_id = get_current_tenant_id());
    ```
5.  **Policy for `UPDATE` and `DELETE`**: Restrict `UPDATE` and `DELETE` operations to the current tenant:
    ```sql
    CREATE POLICY "tenant_isolation_update" ON public.your_table
      FOR UPDATE
      USING (tenant_id = get_current_tenant_id());

    CREATE POLICY "tenant_isolation_delete" ON public.your_table
      FOR DELETE
      USING (tenant_id = get_current_tenant_id());
    ```
6.  **`get_current_tenant_id()` Function**: A secure, session-based function (e.g., a PostgreSQL function that reads `app.tenant_id` from `SET SESSION AUTHORIZATION`) is essential to retrieve the `tenant_id` of the currently authenticated user.
7.  **Superuser/Bypass**: Ensure that only authorized roles (e.g., `service_role` in Supabase) can bypass RLS for administrative tasks, but application users never can.
8.  **Testing**: Thoroughly test RLS policies to prevent data leaks. Automated tests should verify that different tenants cannot access each other's data.

## Application to SaaS Factory Agents:

-   **Architect Agent**: When generating SQL schemas, the agent should automatically include `tenant_id` in relevant tables and generate the corresponding RLS policies. It should also structure API endpoints to align with Clean Architecture's separation of concerns.
-   **The Assembler**: Should ensure that generated code adheres to these architectural patterns, especially in how data is accessed and presented, maintaining the independence of business logic from UI and database specifics.

By embedding these principles, the SaaS Factory will produce applications that are not only robust and secure but also maintainable and scalable, meeting enterprise-grade requirements.
