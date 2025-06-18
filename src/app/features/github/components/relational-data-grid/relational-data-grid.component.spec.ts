import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelationalDataGridComponent } from './relational-data-grid.component';

describe('RelationalDataGridComponent', () => {
  let component: RelationalDataGridComponent;
  let fixture: ComponentFixture<RelationalDataGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelationalDataGridComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RelationalDataGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
