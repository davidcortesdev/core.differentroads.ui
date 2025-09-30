import { Component, Input, OnInit } from '@angular/core';
import { PointsRecord } from '../../../../../../core/models/v2/profile-v2.model';
import { PointsV2Service } from '../../../../../../core/services/v2/points-v2.service';

@Component({
  selector: 'app-points-table',
  standalone: false,
  templateUrl: './points-table.component.html',
  styleUrls: ['./points-table.component.scss']
})
export class PointsTableComponent implements OnInit {
  @Input() points: PointsRecord[] = [];
  @Input() showTable: boolean = false;

  constructor(
    private pointsService: PointsV2Service
  ) {}

  ngOnInit(): void {}

  getFormattedPoints(point: PointsRecord): string {
    return this.pointsService.getFormattedPoints(point);
  }

  getPointsClass(type: string): string {
    return this.pointsService.getPointsClass(type);
  }
}
