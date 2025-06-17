import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { HttpService } from '../../../shared/services/http.service';
import { Observable, BehaviorSubject, interval } from 'rxjs';
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

@Injectable({
  providedIn: 'root'
})
export class GithubService {
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
}
