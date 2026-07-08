import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import { Designation } from '../../../core/models/employee.model';
import {
    DesignationPermissions,
    PermissionDef,
    PermissionGroup,
} from '../../../core/models/permission.model';

// OWNER-only management page for per-designation action permissions (mirrors the menu-nodes page)
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-permissions',
    standalone: true,
    imports: [CommonModule, DashboardLayoutComponent],
    templateUrl: './permissions.html',
    styleUrl: './permissions.css',
})
export class PermissionsComponent implements OnInit {
    private readonly permissionService = inject(PermissionService);
    private readonly toast = inject(ToastService);
    private readonly apiError = inject(ApiErrorHandlerService);

    loading = signal(true);
    saving = signal(false);

    groups = signal<PermissionGroup[]>([]);
    rows = signal<DesignationPermissions[]>([]);

    selectedDesignation = signal<Designation>('ADMIN');

    // Working copy of the selected designation's codes
    draft = signal<ReadonlySet<string>>(new Set());

    designations = computed(() => this.rows().map((row) => row.designation));

    isOwnerSelected = computed(() => this.selectedDesignation() === 'OWNER');

    // Granted codes as saved on the server for the selected designation
    private readonly savedCodes = computed<ReadonlySet<string>>(() => {
        const row = this.rows().find(
            (r) => r.designation === this.selectedDesignation(),
        );
        return new Set(row?.permissions ?? []);
    });

    dirty = computed(() => {
        const saved = this.savedCodes();
        const draft = this.draft();
        if (saved.size !== draft.size) {
            return true;
        }
        return [...draft].some((code) => !saved.has(code));
    });

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.permissionService.getPermissions().subscribe({
            next: (res) => {
                this.groups.set(res.data?.groups ?? []);
                this.rows.set(res.data?.permissions ?? []);
                this.resetDraft();
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.toast.error(APP_MESSAGES.LOAD_PERMISSIONS_FAILED);
            },
        });
    }

    selectDesignation(designation: Designation): void {
        if (this.saving()) {
            return;
        }
        this.selectedDesignation.set(designation);
        this.resetDraft();
    }

    resetDraft(): void {
        this.draft.set(new Set(this.savedCodes()));
    }

    isChecked(code: string): boolean {
        return this.draft().has(code);
    }

    // Whether the selected designation can reach the module's sidebar node
    private hasNodeAccess(nodePath: string): boolean {
        const row = this.rows().find(
            (r) => r.designation === this.selectedDesignation(),
        );
        return !!row?.nodePaths?.includes(nodePath);
    }

    // The owner row is immutable, codes without sidebar access are unavailable, and designation rules lock the rest
    isLocked(group: PermissionGroup, permission: PermissionDef): boolean {
        if (this.isOwnerSelected()) {
            return true;
        }
        if (group.nodePath && !this.hasNodeAccess(group.nodePath)) {
            return true;
        }
        const designation = this.selectedDesignation();
        if (
            permission.allowedDesignations &&
            !permission.allowedDesignations.includes(designation)
        ) {
            return true;
        }
        return !!permission.excludedDesignations?.includes(designation);
    }

    // A whole group is locked when every code in it is locked
    isGroupLocked(group: PermissionGroup): boolean {
        return group.permissions.every((permission) =>
            this.isLocked(group, permission),
        );
    }

    // Why a fully locked group is unavailable for the selected designation
    groupHint(group: PermissionGroup): string {
        if (this.isOwnerSelected()) {
            return '';
        }
        if (group.nodePath && !this.hasNodeAccess(group.nodePath)) {
            return 'No access';
        }
        if (this.isGroupLocked(group)) {
            return 'ADMIN only';
        }
        return '';
    }

    toggle(group: PermissionGroup, permission: PermissionDef, checked: boolean): void {
        if (this.isLocked(group, permission)) {
            return;
        }
        this.draft.update((draft) => {
            const next = new Set(draft);
            if (checked) {
                next.add(permission.code);
            } else {
                next.delete(permission.code);
            }
            return next;
        });
    }

    save(): void {
        if (this.isOwnerSelected() || !this.dirty() || this.saving()) {
            return;
        }

        const designation = this.selectedDesignation();
        const permissions = [...this.draft()];

        this.saving.set(true);
        this.permissionService.updatePermissions(designation, permissions).subscribe({
            next: (res) => {
                this.saving.set(false);
                this.rows.update((rows) =>
                    rows.map((row) =>
                        row.designation === designation ? { ...row, permissions } : row,
                    ),
                );
                this.resetDraft();
                this.toast.success(res.message || APP_MESSAGES.PERMISSIONS_UPDATED);
            },
            error: (err) => {
                this.saving.set(false);
                this.toast.error(
                    this.apiError.message(err, APP_MESSAGES.PERMISSIONS_UPDATE_FAILED),
                );
            },
        });
    }
}