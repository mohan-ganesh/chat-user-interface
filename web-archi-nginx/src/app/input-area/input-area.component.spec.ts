import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputAreaComponent } from './input-area.component';

describe('InputAreaComponent', () => {
  let component: InputAreaComponent;
  let fixture: ComponentFixture<InputAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InputAreaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InputAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
