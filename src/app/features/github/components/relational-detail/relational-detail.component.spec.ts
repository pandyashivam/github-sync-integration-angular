import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelationalDetailComponent } from './relational-detail.component';

describe('RelationalDetailComponent', () => {
  let component: RelationalDetailComponent;
  let fixture: ComponentFixture<RelationalDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelationalDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RelationalDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
