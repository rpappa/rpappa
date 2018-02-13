module semicircle(radius, x, thickness) {
    translate([x, -side/2, 0]) {
        difference() {
            rotate([0, 90, 0]) cylinder(r=radius, h=thickness, center = true, $fn=50);
            translate([-thickness/1.5, -radius, -radius]) cube(size=[thickness*2, radius*2, radius]);
        }
    }
}

start = 0.01;

module semicirclesOnParabola(number, size) {
    thick = size / number;
    for(i=[0:number]) {
        x = start + thick * i;
        //echo(x);
        color( [0.5+sin(i/number*360)/2, 0.5+sin(i/number*360 + 120)/2, 0.5+sin(i/number*360 + 240)/2] )
        semicircle(2 * sqrt(x), x, thick);
    }
}

hull() {
    semicirclesOnParabola(50, 4);
    semicirclesOnParabola(10, 20);
}