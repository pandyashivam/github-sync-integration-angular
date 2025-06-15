import { Component, OnInit, OnDestroy } from '@angular/core';
import { SharedModule } from '../../../../shared/shared/shared.module';
import { GithubService, GithubUser, SyncStatus } from '../../service/github.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SnackBarService } from '../../../../shared/services/snackbar.service';
import { DialogService } from '../../../../shared/services/dialog.service';

@Component({
  selector: 'app-github-connect',
  standalone: true,
  imports: [
    SharedModule
  ],
  templateUrl: './github-connect.component.html',
  styleUrl: './github-connect.component.scss'
})
export class GithubConnectComponent implements OnInit, OnDestroy {
  users: GithubUser[] = [];
  currentUser: GithubUser | null = null;
  userAlreadyConnected: boolean = false;

  constructor(
    private githubService: GithubService,
    private route: ActivatedRoute,
    private snackBarService: SnackBarService,
    private router: Router,
    private dialogService: DialogService
  ) {}

  syncInterval: any;
  ngOnInit(): void {
    this.loadUsers();

    if(localStorage.getItem('github_auth_success')) {
      this.userAlreadyConnected = true;
    }
    
    this.route.queryParams.subscribe(params => {
      if (params['code']) {
        this.handleGithubCallback(params['code']);
      }
      if(params['auth'] === 'success') {
        this.loadUsers();
      }
    });

    this.syncInterval = setInterval(() => {
      this.updateSyncsStatus();
    }, 10000);
  }

  ngOnDestroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  connect(): void {
    this.githubService.initiateGithubAuth();
  }
  
  private handleGithubCallback(code: string): void {
    this.githubService.handleAuthCallback(code).subscribe({
      next: () => {
        this.snackBarService.showSuccess('GitHub authentication successful');
        localStorage.setItem('github_auth_success', 'true');
        this.userAlreadyConnected = true;
        this.loadUsers();
      },
      error: err => this.snackBarService.showError('GitHub authentication error:' + err)
    });
  }

  remove(user: GithubUser): void {
    if (!user || !user._id) {
      this.snackBarService.showError('Cannot remove user: Invalid user data');
      return;
    }

    this.dialogService.confirm(
      'Remove GitHub Integration',
      `Are you sure you want to remove the GitHub integration for ${user.githubName}? This will delete all synced data for this user and cannot be undone.`,
      'Remove',
      'Cancel',
      true
    ).subscribe(confirmed => {
      if (confirmed) {
        this.snackBarService.showInfo('Removing GitHub integration...');
        this.githubService.removeGithubUser(user._id!).subscribe({
          next: (response) => {
            if (response.success) {
              this.snackBarService.showSuccess('GitHub integration successfully removed');
              if (this.users.length <= 1) {
                localStorage.removeItem('github_auth_success');
                this.userAlreadyConnected = false;
              }
              this.loadUsers();
            } else {
              this.snackBarService.showError('Failed to remove GitHub integration: ' + response.message);
            }
          },
          error: (error) => {
            console.error('Error removing GitHub integration:', error);
            this.snackBarService.showError('Failed to remove GitHub integration: ' + 
              (error.error?.message || 'Unknown error'));
          }
        });
      }
    });
  }
  
  private loadUsers(): void {
    this.githubService.getAllUsers().subscribe({
      next: (res: any) => {
        if(res.success) {
          this.users = res.data as any;
        }
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.snackBarService.showError('Failed to load GitHub users');
      }
    });
  }

  updateSyncsStatus() {
    this.githubService.fetchSyncStatus().subscribe({
      next: (res: any) => {
        if(res.success) {
          let syncData = res.data;
          for(let user of this.users) {
            let userSyncData = syncData.find((sync: any) => sync.userId === user._id);
            if(userSyncData) {
              user.isSyncInProgress = userSyncData.isSyncInProgress;
              user.lastSynced = userSyncData.lastSynced;
              user.syncType = userSyncData.syncType;
            }
          }
        }
      },
      error: (err) => {
        console.error('Error loading sync status:', err);
      }
    });
   
  }
  
  syncUser(user: GithubUser): void {
    if (!user || !user._id) {
      this.snackBarService.showError('Cannot sync user: Invalid user data');
      return;
    }

    this.snackBarService.showInfo(`Syncing GitHub data for ${user.githubName}...`);
    user.isSyncInProgress = true;
    
    this.githubService.syncUser(user._id).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBarService.showSuccess('GitHub sync initiated successfully');
        } else {
          user.isSyncInProgress = false;
          this.snackBarService.showError('Failed to initiate GitHub sync: ' + response.message);
        }
      },
      error: (error) => {
        user.isSyncInProgress = false;
        console.error('Error syncing GitHub data:', error);
        this.snackBarService.showError('Failed to initiate GitHub sync: ' + 
          (error.error?.message || 'Unknown error'));
      }
    });
  }
  
  githubSyncedData() {
    this.router.navigate(['/github/data']);
  }
}
