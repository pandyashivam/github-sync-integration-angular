import { Injectable } from '@angular/core';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { HttpService } from '../../../shared/services/http.service';
import { Observable, BehaviorSubject, interval, throwError } from 'rxjs';
import { tap, switchMap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface GithubUser {
  id: number;
  username: string;
  githubName: string;
  isAuthenticated: boolean;
  lastSynced: string;
  LastSynced?: string;
  syncType: string;
  accessToken?: string;
  isSyncInProgress: boolean;
  _id?: string;
}

export interface SyncStatus {
  isSyncInProgress: boolean;
  lastSynced: string;
  syncType: string;
  currentSync?: {
    organizationsStatus: string;
    reposStatus: string;
    commitsStatus: string;
    pullsStatus: string;
    issuesStatus: string;
    issueCommentsStatus: string;
    progress: number;
    error?: string;
    startTime: string;
    endTime?: string;
  };
}

export interface ModelInfo {
  name: string;
}

export interface ModelData {
  success: boolean;
  count: number;
  totalPages: number;
  currentPage: number;
  totalRecords: number;
  fields: ModelField[];
  data: any[];
}

export interface ModelField {
  field: string;
  type: string;
}

export interface RemoveUserResponse {
  success: boolean;
  message: string;
  userId?: string;
  error?: string;
}

export interface UserDetails {
  success: boolean;
  count: number;
  totalPages: number;
  currentPage: number;
  totalRecords: number;
  userDetails: any;
  modelName: string;
  fields: any[];
  data: UserDetailItem[];
}

export interface UserDetailItem {
  id: number;
  summary: string;
  description: string;
  state: string;
  created_at: string;
  updated_at: string;
}

export interface GlobalSearchResult {
  success: boolean;
  count: number;
  totalPages: number;
  currentPage: number;
  totalRecords: number;
  totalMatches: number;
  data: CollectionSearchResult[];
}

export interface CollectionSearchResult {
  collectionName: string;
  matchCount: number;
  matches: GlobalSearchItem[];
}

export interface GlobalSearchItem {
  fieldName: string;
  value: string;
  recordId: string | number;
  recordData: any;
}

export interface RelationalDataResponse {
  success: boolean;
  count: number;
  totalCount: number;
  totalPRs: number;
  totalIssues: number;
  currentPage: number;
  totalPages: number;
  repositories: any[];
  availableStates: string[];
  data: RepoRelationship[];
  fields: {
    pullRequestFields: ModelField[];
    issueFields: ModelField[];
    commitFields: ModelField[];
    historyFields: ModelField[];
  };
}

export interface DistinctFieldValuesResponse {
  success: boolean;
  count: number;
  data: any[];
}

export interface RepoRelationship {
  repositoryId: string;
  repositoryName: string;
  repositoryFullName: string;
  commits: CommitItem[];
  pullRequests: PullRequestItem[];
  issues: IssueItem[];
}

export interface CommitItem {
  type: string;
  repositoryId: string;
  repositoryName: string;
  repositoryFullName: string;
  sha?: string;
  message?: string;
  date?: string;
  author?: {
    name?: string;
    email?: string;
    date?: string;
  };
  [key: string]: any;
}

export interface PullRequestItem {
  type: string;
  repositoryId: string;
  repositoryName: string;
  repositoryFullName: string;
  number?: number;
  title?: string;
  state?: string;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
  merged_at?: string;
  user?: {
    login?: string;
    avatar_url?: string;
    id?: number;
  };
  [key: string]: any;
}

export interface IssueItem {
  type: string;
  repositoryId: string;
  repositoryName: string;
  repositoryFullName: string;
  number?: number;
  title?: string;
  state?: string;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
  user?: {
    login?: string;
    avatar_url?: string;
    id?: number;
  };
  history?: IssueHistoryItem[];
  [key: string]: any;
}

export interface IssueHistoryItem {
  issueId: string;
  field?: string;
  from?: string;
  to?: string;
  created_at?: string;
  actor?: {
    login?: string;
    avatar_url?: string;
  };
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class GithubService {
  private lastRelationalDataFields: {
    pullRequestFields: ModelField[];
    issueFields: ModelField[];
    commitFields: ModelField[];
    historyFields: ModelField[];
  } | null = null;
  
  constructor(private httpService: HttpService) {}

  initiateGithubAuth(): void {
    window.location.href = `${environment.apiUrl}/auth/github`;
  }

  handleAuthCallback(code: string) {
    return this.httpService.get(environment.apiUrl + '/auth/github/callback', { code });
  }
  
  getAllUsers() {
    return this.httpService.get(`/users`);
  }
  
  getDataGridUsers() {
    return this.httpService.get<{success: boolean; count: number; data: GithubUser[]}>(`/datagrid/users`);
  }

  fetchSyncStatus() {
    return this.httpService.get(`/users/sync-status`);
  }
  
  getAvailableModels() {
    return this.httpService.get<{success: boolean; count: number; data: ModelInfo[]}>(`/datagrid/models`);
  }
  
  getModelData(modelName: string, params: {
    userId: string;
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    sortOrder?: 'asc' | 'desc';
    [key: string]: any;
  }) {
    return this.httpService.get<ModelData>(`/datagrid/data/${modelName}`, params);
  }
  
  removeGithubUser(userId: string): Observable<RemoveUserResponse> {
    return this.httpService.delete<RemoveUserResponse>(`/auth/github/user/${userId}`);
  }
  
  syncUser(userId: string): Observable<any> {
    return this.httpService.post(`/auth/github/sync/${userId}`, {});
  }

  getUserDetails(assigneeId: string, modelName: string, params: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    sortOrder?: 'asc' | 'desc';
    [key: string]: any;
  } = {}) {
    return this.httpService.get<UserDetails>(`/datagrid/user-details/${assigneeId}/${modelName}`, params);
  }

  searchAcrossAllCollections(userId: string, searchText: string, params: {
    page?: number;
    limit?: number;
    [key: string]: any;
  } = {}) {
    return this.httpService.get<GlobalSearchResult>(`/datagrid/global-search/${userId}`, {
      search: searchText,
      ...params
    });
  }
  
  getRelationalData(userId: string, params: {
    repoId?: string;
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    sortOrder?: 'asc' | 'desc';
    filterType?: string;
    [key: string]: any;
  } = {}) {
    return this.httpService.get<RelationalDataResponse>(`/datagrid/relational-data/${userId}`, params)
      .pipe(
        tap(response => {
          if (response.fields) {
            this.lastRelationalDataFields = response.fields;
          }
        })
      );
  }
  
  getLastRelationalDataFields() {
    return this.lastRelationalDataFields;
  }
  
  getUserRepositories(userId: string) {
    return this.httpService.get<{success: boolean; count: number; data: any[]}>(`/datagrid/repositories/${userId}`);
  }

  getDistinctFieldValues(userId: string, repoId: string, filterType: string, fieldPath: string): Observable<DistinctFieldValuesResponse> {
    console.log('Service getDistinctFieldValues called with:', {userId, repoId, filterType, fieldPath});
    
    if (!fieldPath) {
      console.error('Field path is required');
      return throwError(() => new Error('Field path is required'));
    }
    
    const params = new HttpParams()
      .set('repoId', repoId || '')
      .set('filterType', filterType || 'Pull Requests')
      .set('fieldPath', fieldPath);
      
    return this.httpService.get<DistinctFieldValuesResponse>(`/datagrid/distinct-values/${userId}`, { params });
  }
}
