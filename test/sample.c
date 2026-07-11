// Simple LPC test file
#include <mudlib.h>
inherit BASE;
int counter;
string name;
mapping data = ([ ]);
mixed *items = ({ });

void reset(status arg) {
  if (arg) {
    return;
  }

  counter = 0;
  name = "test";
}

string query_name() {
  return name;
}

void set_counter(int val) {
  counter = val;
}

int get_counter() {
  return counter;
}
