import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="empty-state card">
      <p class="eyebrow">{{ eyebrow() }}</p>
      <h3>{{ title() }}</h3>
      <p>{{ description() }}</p>
    </section>
  `,
})
export class EmptyStateComponent {
  readonly eyebrow = input('Sin resultados');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}

