import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, Subject } from 'rxjs';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination';
import { NodeService } from '../../../core/services/node.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { ConfirmModalService } from '../../../core/services/confirm-modal.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import { Designation } from '../../../core/models/employee.model';
import {
  ADMIN_MAX_PATHS,
  MenuNode,
  NODE_DESIGNATIONS,
  OWNER_ONLY_PATHS,
} from '../../../core/models/node.model';

// OWNER-only management page for the sidebar menu nodes (mirrors the employees page)
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-menu-nodes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DashboardLayoutComponent,
    PaginationComponent,
    DatePipe,
  ],
  templateUrl: './menu-nodes.html',
  styleUrl: './menu-nodes.css',
})
export class MenuNodesComponent implements OnInit {
  private readonly nodeService = inject(NodeService);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly confirmModal = inject(ConfirmModalService);

  loading = signal(true);
  nodes = signal<MenuNode[]>([]);

  searchTerm = signal('');

  // Pagination
  page = signal(1);
  limit = 10;
  total = signal(0);
  totalPages = signal(0);

  // Detail modal
  selected = signal<MenuNode | null>(null);
  deleting = signal(false);

  // Create/edit form modal
  formOpen = signal(false);
  formMode = signal<'create' | 'edit'>('create');
  editingNodeId = signal<string | null>(null);
  saving = signal(false);
  formError = signal('');

  formName = signal('');
  formPath = signal('');
  formIcon = signal('');
  formDesignations = signal<Designation[]>([]);

  readonly allDesignations = NODE_DESIGNATIONS;

  // Debounce search input
  private readonly searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.load();

    this.searchSubject.pipe(debounceTime(300)).subscribe((term) => {
      this.searchTerm.set(term);
      this.page.set(1);
      this.load();
    });
  }

  load(): void {
    this.loading.set(true);
    this.nodeService
      .getNodes(this.page(), this.limit, this.searchTerm() || undefined)
      .subscribe({
        next: (res) => {
          this.nodes.set(res.data.nodes || []);
          this.total.set(res.data.total || 0);
          this.totalPages.set(res.data.totalPages || 1);
          // Re-clamp if the current page fell past the end after a shrink
          if (this.total() > 0 && this.page() > this.totalPages()) {
            this.page.set(this.totalPages());
            this.load();
            return;
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error(APP_MESSAGES.LOAD_NODES_FAILED);
        },
      });
  }

  onSearch(value: string): void {
    this.searchSubject.next(value);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) {
      return;
    }
    this.page.set(p);
    this.load();
  }

  // Detail modal
  open(item: MenuNode): void {
    this.selected.set(item);
  }

  close(): void {
    this.selected.set(null);
  }

  // Create/edit form modal
  openCreate(): void {
    this.formMode.set('create');
    this.editingNodeId.set(null);
    this.formName.set('');
    this.formPath.set('');
    this.formIcon.set('');
    this.formDesignations.set([]);
    this.formError.set('');
    this.formOpen.set(true);
  }

  openEdit(item: MenuNode): void {
    this.formMode.set('edit');
    this.editingNodeId.set(item.nodeId);
    this.formName.set(item.name);
    this.formPath.set(item.path);
    this.formIcon.set(item.icon || '');
    this.formDesignations.set([...item.allowedDesignations]);
    this.formError.set('');
    this.close();
    this.formOpen.set(true);
  }

  closeForm(): void {
    if (this.saving()) {
      return;
    }
    this.formOpen.set(false);
  }

  // System nodes stay owner-locked so their designations can't be edited
  isLockedNode(): boolean {
    return OWNER_ONLY_PATHS.has(this.formPath().trim());
  }

  // Management nodes cap out at ADMIN so staff can never be granted them
  isAdminMaxNode(): boolean {
    return ADMIN_MAX_PATHS.has(this.formPath().trim());
  }

  isDesignationLocked(d: Designation): boolean {
    if (this.isLockedNode()) {
      return true;
    }
    return this.isAdminMaxNode() && d !== 'OWNER' && d !== 'ADMIN';
  }

  isDesignationSelected(d: Designation): boolean {
    return this.formDesignations().includes(d);
  }

  toggleDesignation(d: Designation, checked: boolean): void {
    if (this.isDesignationLocked(d)) {
      return;
    }
    this.formDesignations.update((list) =>
      checked ? [...list, d] : list.filter((x) => x !== d),
    );
  }

  save(): void {
    const name = this.formName().trim();
    const path = this.formPath().trim();
    const icon = this.formIcon().trim();
    const allowedDesignations = this.formDesignations();
    const isEdit = this.formMode() === 'edit' && !!this.editingNodeId();

    // Client-side validation mirrors the backend rules
    if (!name) {
      this.formError.set('Node name is required.');
      return;
    }
    // Path is required only when creating a node because it is immutable afterwards
    if (!isEdit && !path?.startsWith('/')) {
      this.formError.set('Path is required and must start with /.');
      return;
    }
    if (allowedDesignations.length === 0) {
      this.formError.set('Select at least one designation.');
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    // The path is never sent on update — it cannot be changed after creation
    const request = isEdit
      ? this.nodeService.updateNode(this.editingNodeId()!, {
        name,
        allowedDesignations,
        ...(icon ? { icon } : {}),
      })
      : this.nodeService.createNode({
        name,
        path,
        allowedDesignations,
        ...(icon ? { icon } : {}),
      });

    request.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.toast.success(
          res.message ||
          (this.formMode() === 'edit'
            ? APP_MESSAGES.NODE_UPDATED
            : APP_MESSAGES.NODE_CREATED),
        );
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        const fallback =
          this.formMode() === 'edit'
            ? APP_MESSAGES.NODE_UPDATE_FAILED
            : APP_MESSAGES.NODE_CREATE_FAILED;
        this.formError.set(this.apiError.message(err, fallback));
      },
    });
  }

  async deleteNode(item: MenuNode): Promise<void> {
    const result = await this.confirmModal.open({
      title: 'Delete Menu Node',
      message: `Are you sure you want to delete "${item.name}" (${item.nodeId})? It will be removed from every sidebar.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!result.confirmed) {
      return;
    }

    this.deleting.set(true);
    this.nodeService.deleteNode(item.nodeId).subscribe({
      next: (res) => {
        this.deleting.set(false);
        this.toast.success(res.message || APP_MESSAGES.NODE_DELETED);
        this.close();
        this.load();
      },
      error: (err) => {
        this.deleting.set(false);
        this.toast.error(
          this.apiError.message(err, APP_MESSAGES.NODE_DELETE_FAILED),
        );
      },
    });
  }

  trackByNodeId = (_: number, item: MenuNode) => item.nodeId;
}