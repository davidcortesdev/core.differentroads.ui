import { Component, Input } from '@angular/core';

interface CommunityHero {
  title: string;
  googleRating: number;
  featured: {
    images: string[];
    content: string; // This will contain the Quill HTML content
  };
}

@Component({
  selector: 'app-community-hero',
  standalone: false,
  templateUrl: './community-hero.component.html',
  styleUrl: './community-hero.component.scss',
})
export class CommunityHeroComponent {
  @Input() data: CommunityHero = {
    title: 'Titular para sección comunidad',
    googleRating: 4.5,
    featured: {
      images: [
        'https://picsum.photos/800/800?random=1',
        'https://picsum.photos/800/800?random=2',
      ],
      content:
        '<p><span style="font-size: 0.75em;">Venecia </span><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAHKSURBVHgBtZPLTcNAEIZn1gYh4ODtwOkAKsDceATJFySwkEgHQAUJFRA6iCWUIHHAiPC4JVSQUEHSwQYJIQ7ODrNOnNh5HFnJ8mP+mfn32zHCkqV8z4GVddc8y4fX7jIdziWeFD1EKHPEywuppvXwWt6/97PfRfblKyiWUUCLED5I2wWn3kRzEdjbmhBR2B11fLC10IEK/C2EuGPEsh4ttKyCYoUTLujnuyCj9iDnADG+QcJqmqxOjy4HwWGPr4463fcTFvVmhVt2YW3zMrcFVfIdIPB0PAxHHA5KzOGCBF4RiRDRejRsTIxIhyjoPM/gF5ykQ0obhUdAobxrRrLxXOUvXUBK984adPIFZhdCn8ntjNzsudyWE7A/yhBOVpoUkPcRB3GQ2oRVu8pQ3EFQVEy+RwAfstGMklisXSL4TAvY065k7JsCbVmLDOGCOuOCsd0fNRjLLHFOhLWp2fEyYtTwSDrenh2WicbAFVaZtLWbFp0wYGBttsqEmbgZ47nkPZdHqcyncJt1lIe4aleMKbG+cTOfbLX4ZJ5k46WajS34F3wXxbAFpIGnN+S7wzPM+06SS7P6uQKTQsGREft8hAx0yPPwFsF/rD+OoMTdAVyvEQAAAABJRU5ErkJggg==" width="12"></p><p><strong style="font-size: 1.5rem;">Descubre el viaje de @influencer a Japón con Different</strong></p><p><span style="font-size: 0.875rem;">Lorem ipsum dolor sit amet consectetur. Lorem ipsum dolor sit amet consectetur. </span></p><p><span style="font-size: 0.75em;">@different_roads</span></p>',
    },
  };
}
