#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <unistd.h>

#ifndef NODE_MAJOR
#error Must pass NODE_MAJOR to the compiler (eg "10")
#define NODE_MAJOR ""
#endif

#define AWS_EXECUTION_ENV "AWS_Lambda_nodejs" NODE_MAJOR "_lambci"
#define NODE_PATH "/opt/nodejs/node" NODE_MAJOR "/node_modules:" \
                  "/opt/nodejs/node_modules:"                    \
                  "/var/runtime/node_modules:"                   \
                  "/var/runtime:"                                \
                  "/var/task"
#define MIN_MEM_SIZE 128
#define ARG_BUF_SIZE 32

int main(void) {
  setenv("AWS_EXECUTION_ENV", AWS_EXECUTION_ENV, true);
  setenv("NODE_PATH", NODE_PATH, true);

  const char *mem_size_str = getenv("AWS_LAMBDA_FUNCTION_MEMORY_SIZE");
  int mem_size = mem_size_str != NULL ? atoi(mem_size_str) : MIN_MEM_SIZE;

  char max_semi_space_size[ARG_BUF_SIZE];
  snprintf(max_semi_space_size, ARG_BUF_SIZE, "--max-semi-space-size=%d", mem_size * 5 / 100);

  char max_old_space_size[ARG_BUF_SIZE];
  snprintf(max_old_space_size, ARG_BUF_SIZE, "--max-old-space-size=%d", mem_size * 90 / 100);

  execv("/opt/bin/node", (char *[]){
                             "node",
                             "--expose-gc",
                             max_semi_space_size,
                             max_old_space_size,
                             "/opt/bootstrap.js",
                             NULL});
  perror("Could not execv");
  return EXIT_FAILURE;
}
