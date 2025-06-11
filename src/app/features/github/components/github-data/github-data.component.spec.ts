import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GithubDataComponent } from './github-data.component';

describe('GithubDataComponent', () => {
  let component: GithubDataComponent;
  let fixture: ComponentFixture<GithubDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GithubDataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GithubDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
